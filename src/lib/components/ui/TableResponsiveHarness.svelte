<script lang="ts">
  import TableResponsive from './TableResponsive.svelte';
</script>

<TableResponsive columns={['Acción', 'Responsable', 'Destino']}>
  <tr>
    <td data-th="Acción">Reabrió hilo</td>
    <td data-th="Responsable">Gareth</td>
    <td data-th="Destino">/hilo/123</td>
  </tr>
</TableResponsive>
